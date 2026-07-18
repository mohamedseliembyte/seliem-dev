export type PlaceLead = {
  placeId: string
  business: string
  niche: string | null
  city: string | null
  state: string | null
  phone: string | null
  address: string | null
  website: string | null
  mapsUrl: string | null
}

type Component = { longText?: string; shortText?: string; types?: string[] }
type GooglePlace = { id?: string; displayName?: { text?: string }; primaryTypeDisplayName?: { text?: string }; formattedAddress?: string; addressComponents?: Component[]; nationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string }

function component(place: GooglePlace, type: string, short = false) {
  const match = place.addressComponents?.find((item) => item.types?.includes(type))
  return (short ? match?.shortText : match?.longText) || null
}

function normalize(place: GooglePlace): PlaceLead | null {
  if (!place.id || !place.displayName?.text) return null
  const city = component(place, 'locality') || component(place, 'postal_town') || component(place, 'administrative_area_level_2')
  return { placeId: place.id, business: place.displayName.text, niche: place.primaryTypeDisplayName?.text || null, city, state: component(place, 'administrative_area_level_1', true), phone: place.nationalPhoneNumber || null, address: place.formattedAddress || null, website: place.websiteUri || null, mapsUrl: place.googleMapsUri || null }
}

export async function searchPlaces(textQuery: string, maxResultCount = 10) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('Google Places is not configured yet.')
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.addressComponents,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri' },
    body: JSON.stringify({ textQuery, maxResultCount, languageCode: 'en' }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Google Places returned ${response.status}.`)
  return ((payload.places || []) as GooglePlace[]).map(normalize).filter((place): place is PlaceLead => !!place)
}
