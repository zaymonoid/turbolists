import Foundation

public struct Trip: Equatable, Hashable, Identifiable, Sendable {
    public var id: TripId
    public var name: String
    public var createdAt: String
    public var kitIds: [KitId]
    public var archived: Bool?
    public var checked: Set<ItemId>
    public init(id: TripId, name: String, createdAt: String, kitIds: [KitId] = [], archived: Bool? = nil, checked: Set<ItemId> = []) {
        self.id = id; self.name = name; self.createdAt = createdAt
        self.kitIds = kitIds; self.archived = archived; self.checked = checked
    }
}

private func requireTrip(_ trips: [Trip], _ id: TripId) throws {
    try invariant(trips.contains { $0.id == id }, "Trip with id \"\(id)\" not found")
}

private func updating(_ trips: [Trip], _ id: TripId, _ f: (inout Trip) -> Void) -> [Trip] {
    trips.map { var t = $0; if t.id == id { f(&t) }; return t }
}

public func createTrip(_ trips: [Trip], id: TripId, name: String, createdAt: String) throws -> [Trip] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Trip name must not be empty")
    try invariant(!trips.contains { $0.id == id }, "Trip with id \"\(id)\" already exists")
    return trips + [Trip(id: id, name: name, createdAt: createdAt)]
}

/// Reuse a trip's kits without carrying over its packing progress.
public func duplicateTrip(_ trips: [Trip], sourceId: TripId, id: TripId, name: String, createdAt: String) throws -> [Trip] {
    guard let source = trips.first(where: { $0.id == sourceId }) else {
        throw InvariantViolation("Trip with id \"\(sourceId)\" not found")
    }
    let result = try createTrip(trips, id: id, name: name, createdAt: createdAt)
    return updating(result, id) { $0.kitIds = source.kitIds }
}

public func renameTrip(_ trips: [Trip], id: TripId, name: String) throws -> [Trip] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Trip name must not be empty")
    try requireTrip(trips, id)
    return updating(trips, id) { $0.name = name }
}

public func addKitToTrip(_ trips: [Trip], tripId: TripId, kitId: KitId) throws -> [Trip] {
    try requireTrip(trips, tripId)
    return updating(trips, tripId) { $0.kitIds = dedupe($0.kitIds + [kitId]) }
}

public func removeKitFromTrip(_ trips: [Trip], tripId: TripId, kitId: KitId) throws -> [Trip] {
    try requireTrip(trips, tripId)
    return updating(trips, tripId) { $0.kitIds.removeAll { $0 == kitId } }
}

public func toggleChecked(_ trips: [Trip], tripId: TripId, itemId: ItemId) throws -> [Trip] {
    try requireTrip(trips, tripId)
    return updating(trips, tripId) {
        if $0.checked.contains(itemId) { $0.checked.remove(itemId) } else { $0.checked.insert(itemId) }
    }
}

public func resetChecks(_ trips: [Trip], tripId: TripId) throws -> [Trip] {
    try requireTrip(trips, tripId)
    return updating(trips, tripId) { $0.checked = [] }
}

public func deleteTrip(_ trips: [Trip], id: TripId) throws -> [Trip] {
    try requireTrip(trips, id)
    return trips.filter { $0.id != id }
}

/// Archiving changes organization only; packing progress and kits stay intact.
public func setTripArchived(_ trips: [Trip], id: TripId, archived: Bool) throws -> [Trip] {
    try requireTrip(trips, id)
    return updating(trips, id) { $0.archived = archived }
}
