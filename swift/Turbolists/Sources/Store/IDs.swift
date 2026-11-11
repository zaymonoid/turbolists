import TurbolistsCore

func newItemId() -> ItemId { ItemId(ULID.generate()) }
func newKitId() -> KitId { KitId(ULID.generate()) }
func newTripId() -> TripId { TripId(ULID.generate()) }
