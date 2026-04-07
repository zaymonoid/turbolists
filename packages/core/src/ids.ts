export type ItemId = string & { readonly __brand: "ItemId" };
export type FacetId = string & { readonly __brand: "FacetId" };
export type TripId = string & { readonly __brand: "TripId" };

export const itemId = (s: string): ItemId => s as ItemId;
export const facetId = (s: string): FacetId => s as FacetId;
export const tripId = (s: string): TripId => s as TripId;
