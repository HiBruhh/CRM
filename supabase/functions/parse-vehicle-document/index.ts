import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const systemPrompt = `You are an OCR engine for Polish vehicle registration documents (dowód rejestracyjny).
Analyze the provided image and extract the fields below. Polish registration documents use lettered fields. Use the mapping below to locate each value.

Polish field map:
- A = numer rejestracyjny pojazdu (registration plate)
- B = data pierwszej rejestracji pojazdu (first registration date). This is NOT the inspection expiry date; do NOT use field B for inspection_expiry.
- C.1.x = właściciel dowodu rejestracyjnego (ignore for vehicle data)
- C.2.x = właściciel pojazdu (ignore for vehicle data)
- D.1 = marka pojazdu (brand)
- D.2 = typ pojazdu (vehicle type, e.g. hatchback, sedan)
- D.3 = model pojazdu (model)
- E = numer VIN bądź numer nadwozia, podwozia lub ramy pojazdu
- F.1 = maksymalna masa całkowita (ignore)
- F.2 = dopuszczalna masa całkowita (ignore)
- F.3 = dopuszczalna masa całkowita zespołu pojazdów (ignore)
- G = masa własna (ignore)
- H = okres ważności dowodu rejestracyjnego (this equals the next mandatory technical inspection date)
- I = data wydania dowodu rejestracyjnego (ignore)
- J = kategoria pojazdu (e.g. M1, N1)
- K = numer świadectwa homologacji (ignore)
- L = liczba osi (ignore)
- O.1/O.2 = masa przyczepy (ignore)
- P.1 = pojemność silnika (cm³)
- P.2 = maksymalna moc netto silnika (ignore)
- P.3 = rodzaj paliwa
- Q = stosunek mocy do masy (ignore)
- S.1/S.2 = liczba miejsc (ignore)

Required JSON format:
{
  "brand": "string",
  "model": "string",
  "production_year": number,
  "registration_plate": "string",
  "vin": "string",
  "engine_capacity": "string",
  "fuel_type": "string",
  "transmission": "string",
  "license_category": "string",
  "insurance_expiry": "YYYY-MM-DD",
  "inspection_expiry": "YYYY-MM-DD"
}

Extraction rules:
- registration_plate: read from field A. Preserve spaces exactly as shown, e.g. "WX 12345", "WZ 1234A", "KR 1234J".
- brand: read from field D.1. Return only the brand name, e.g. "Audi", "BMW", "Ford", "Toyota".
- model: read from field D.3. If D.2 and D.3 together form a common model name, you may combine them, but prefer D.3.
- vin: read from field E. It is usually 17 characters. Copy it exactly, preserving both letters and digits.
- engine_capacity: read from field P.1, e.g. "1968 cm³", "1.9 TDI". Keep the unit if present.
- fuel_type: read from field P.3 and normalize to one of: benzyna, diesel, LPG, EV, hybryda. If the label says "olej napędowy", map to diesel. If it says "benzyna + gaz", map to LPG.
- license_category: derive from field J (kategoria pojazdu). If J is M1, return "B". If J is N1/N2/N3, return "C". If J is L3e/L4e/L5e/L6e/L7e, return "A" or "A1" or "A2" depending on engine size. For motorcycles <=125cc use A1, <=35kW use A2, otherwise A. If unclear, return "B" for passenger cars. Category AM is for mopeds. Category B+E/C+E/D+E are for vehicles with trailers over 750 kg; only use these if the document explicitly indicates a towing allowance above 750 kg (fields O.1/O.2).
- inspection_expiry: read ONLY from field H (okres ważności dowodu rejestracyjnego). This is the date by which the next mandatory technical inspection must be performed. Do NOT confuse this with field B. Format as YYYY-MM-DD. If only month/year is visible, use the last day of that month.
- production_year: the production year is NOT printed directly on the Polish registration document. Field B shows the first registration date, not the production year. Try to infer the production year only if the document contains a year somewhere else (e.g. in the model name or an additional sticker). Otherwise return null.
- transmission: the transmission type is NOT printed on the Polish registration document. Return null unless you can confidently infer it from the model/variant.
- insurance_expiry: the insurance expiry date is NOT printed on the registration document. Return null.
- If a field cannot be read or is not present on the document, return null for that field. Never omit any field from the JSON.
- Do not add markdown, explanations, or comments. Return ONLY the JSON object.`

const parseJsonResponse = (rawContent: any) => {
  if (typeof rawContent !== 'string') {
    return rawContent
  }

  try {
    return JSON.parse(rawContent)
  } catch {
    const codeBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1])
    }
    throw new Error('Nie udało się sparsować odpowiedzi jako JSON')
  }
}

const callGroq = async (apiKey: string, image: string) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Przeanalizuj ten dowód rejestracyjny i zwróć dane pojazdu w wymaganym formacie JSON.' },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq API error: ${response.status} ${errText}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error('Brak odpowiedzi z modelu Groq')
  }

  return parseJsonResponse(rawContent)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()
    if (!image) {
      return new Response(JSON.stringify({ error: 'Brak obrazu w żądaniu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Brak klucza GROQ_API_KEY w zmiennych środowiskowych' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const parsed = await callGroq(apiKey, image)

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('parse-vehicle-document error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
