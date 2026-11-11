export type ItemId = string & { readonly __brand: "ItemId" };
export type KitId = string & { readonly __brand: "KitId" };
export type TripId = string & { readonly __brand: "TripId" };

export const itemId = (s: string): ItemId => s as ItemId;
export const kitId = (s: string): KitId => s as KitId;
export const tripId = (s: string): TripId => s as TripId;
