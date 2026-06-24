import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const systemPrompt = `You are an OCR engine for Polish vehicle registration documents (dowód rejestracyjny).
Analyze the provided image and extract the fields below.
Return ONLY a JSON object. Do not add markdown, explanations, or comments.

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

Rules:
- production_year must be a 4-digit number.
- Dates must be ISO 8601 (YYYY-MM-DD). If a date is only month/year, pick the last day of that month.
- fuel_type: map to one of: benzyna, diesel, LPG, EV, hybryda.
- transmission: map to one of: manual, automat.
- license_category: map to one of: AM, A, A1, A2, B, B+E, C, C+E, D, D+E.
- If a field cannot be read, return null or an empty string, never omit it.
- VIN is usually 17 characters; copy it exactly as shown.
- Registration plate format examples: WX 12345, WZ 1234A, KR 1234J. Preserve spaces if present.`

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

const callXAI = async (apiKey: string, image: string) => {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-vision-beta',
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
    throw new Error(`xAI API error: ${response.status} ${errText}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error('Brak odpowiedzi z modelu xAI')
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

    const apiKey = Deno.env.get('XAI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Brak klucza XAI_API_KEY w zmiennych środowiskowych' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const parsed = await callXAI(apiKey, image)

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
