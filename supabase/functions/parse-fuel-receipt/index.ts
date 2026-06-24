import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const systemPrompt = `You are an OCR engine for Polish fuel receipts from gas stations.
Your task is to extract ONLY fuel-related purchases. Ignore all other items (food, drinks, washer fluid, chewing gum, car wash, etc.).

How to read the receipt:
1. Locate the receipt date at the top of the receipt (format YYYY-MM-DD).
2. Scan the item lines for fuel types. Look for keywords such as: PB95, PB.95, PB98, PB.98, ON, DIESEL, LPG, AUTOGAZ, BENZYNA, BENZYNA 95, BENZYNA 98.
3. When you find a fuel line, locate the adjacent calculation line. On Polish receipts it usually looks like: [quantity]litr * [unit price] = [total] (e.g. "34,72litr*3,55= 123,26 A" or "34,72 litr * 3,55 = 123,26 A").
4. Ignore distributor numbers (e.g. "dystr.: 4"), pump numbers, and any non-fuel products.
5. Convert Polish decimal commas to dots (e.g. "3,55" becomes 3.55, "34,72" becomes 34.72).
6. A single receipt may contain multiple fuel types (e.g. PB95 and LPG). Create one fuels entry per fuel type.

Return ONLY a JSON object in this exact format:
{
  "date": "YYYY-MM-DD",
  "fuels": [
    {
      "type": "PB95",
      "volume_liters": 32.5,
      "unit_price": 6.55,
      "total_price": 93.92
    }
  ],
  "grand_total_fuel_only": 126.67
}

Rules:
- date: ISO 8601 (YYYY-MM-DD). Use the receipt date. If the year is missing, assume the current year.
- fuels array: one object per fuel type found on the receipt.
- type: normalize to one of: PB95, PB98, ON, Diesel, LPG, EV. Examples:
  - "PB95", "BENZYNA 95", "PB.95" or just "BENZYNA" when 95 is implied -> PB95
  - "PB98", "BENZYNA 98", "PB.98" -> PB98
  - "ON", "DIESEL", "OLEJ NAPEDOWY" -> ON (or Diesel)
  - "LPG", "AUTOGAZ" -> LPG
  - EV charging -> EV
  - If unsure, keep the exact label from the receipt.
- volume_liters: number of liters or kWh for EV charging. Convert commas to dots.
- unit_price: price per liter or per kWh in PLN. Convert commas to dots.
- total_price: total for that fuel line (use the value from the receipt if present). Convert commas to dots.
- grand_total_fuel_only: sum of all fuel total_price values.
- If no fuel is found, return an empty fuels array and grand_total_fuel_only: 0.
- Do not add markdown, explanations, or comments. Only JSON.`

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
            { type: 'text', text: 'Przeanalizuj ten paragon ze stacji benzynowej i zwróć tylko pozycje paliwowe w wymaganym formacie JSON.' },
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

    // Normalize fuels array
    if (!parsed.fuels || !Array.isArray(parsed.fuels)) {
      parsed.fuels = []
    }

    // Recalculate grand_total_fuel_only to be safe
    parsed.grand_total_fuel_only = Number(parsed.fuels.reduce((sum: number, fuel: any) => {
      return sum + (Number(fuel.total_price) || 0)
    }, 0).toFixed(2))

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('parse-fuel-receipt error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
