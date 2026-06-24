import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const systemPrompt = `You are an OCR engine for fuel receipts from Polish gas stations.
Analyze the provided receipt image and extract ONLY fuel-related items.
Ignore absolutely all non-fuel purchases (food, drinks, washer fluid, chewing gum, car wash, etc.).

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
- fuels array: one object per fuel type found on the receipt. A single receipt may contain multiple fuel types (e.g., PB95 and LPG).
- type: normalize to one of: PB95, PB98, ON, Diesel, LPG, EV. If you are unsure, keep the exact label from the receipt.
- volume_liters: number of liters or kWh for EV charging.
- unit_price: price per liter or per kWh in PLN.
- total_price: volume_liters * unit_price (use the value from the receipt if present).
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
