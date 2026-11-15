/** Reset Maps URL + derived pin state after the user clears a paste field. */
export function clearMapsFieldState() {
  return {
    mapsUrl: "",
    lat: null as number | null,
    lng: null as number | null,
  };
}
