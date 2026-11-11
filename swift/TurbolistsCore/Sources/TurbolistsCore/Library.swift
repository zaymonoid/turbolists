import Foundation

public struct Library: Equatable, Sendable {
    public var items: [Item]
    public var kits: [Kit]
    public var trips: [Trip]
    public init(items: [Item] = [], kits: [Kit] = [], trips: [Trip] = []) {
        self.items = items; self.kits = kits; self.trips = trips
    }
}

// MARK: - Loading (JSON → domain)

/// Parses JSON text then loads it tolerantly. Throws only if the text isn't valid JSON
/// (the TS caller's `JSON.parse` throws in that case).
public func loadLibrary(json: String) throws -> Library {
    let raw = try JSONSerialization.jsonObject(with: Data(json.utf8), options: [.fragmentsAllowed])
    return loadLibrary(raw)
}

/// Accepts any value from `JSONSerialization`; anything unexpected degrades to defaults.
public func loadLibrary(_ raw: Any?) -> Library {
    guard let data = raw as? [String: Any] else { return Library() }
    func list(_ key: String) -> [Any] { data[key] as? [Any] ?? [] }
    return Library(
        items: dedupeEntities(list("items").map(loadItem), id: \.id),
        kits: dedupeEntities(list("kits").map(loadKit), id: \.id),
        trips: dedupeEntities(list("trips").map(loadTrip), id: \.id)
    )
}

private func dedupeEntities<T, ID: Hashable>(_ entities: [T], id: KeyPath<T, ID>) -> [T] {
    var seen = Set<ID>()
    return entities.filter { seen.insert($0[keyPath: id]).inserted }
}

/// Mirrors JS `String(v)` for JSON values (null/undefined handled by callers).
private func jsString(_ v: Any) -> String {
    if let s = v as? String { return s }
    if let n = v as? NSNumber {
        if CFGetTypeID(n) == CFBooleanGetTypeID() { return n.boolValue ? "true" : "false" }
        let d = n.doubleValue
        if d == d.rounded(), abs(d) < 1e21 { return String(Int64(d)) }
        return "\(d)"
    }
    if v is NSNull { return "null" }
    if let a = v as? [Any] { return a.map { $0 is NSNull ? "" : jsString($0) }.joined(separator: ",") }
    return "[object Object]"
}

private func field(_ d: [String: Any], _ key: String) -> Any? {
    guard let v = d[key], !(v is NSNull) else { return nil }
    return v
}

private func loadItem(_ raw: Any) -> Item {
    let d = raw as? [String: Any] ?? [:]
    return Item(
        id: ItemId(field(d, "id").map(jsString) ?? ""),
        name: field(d, "name").map(jsString) ?? "",
        notes: field(d, "notes").map(jsString)
    )
}

private func loadKit(_ raw: Any) -> Kit {
    let d = raw as? [String: Any] ?? [:]
    return Kit(
        id: KitId(field(d, "id").map(jsString) ?? ""),
        name: field(d, "name").map(jsString) ?? "",
        itemIds: dedupe((d["itemIds"] as? [Any] ?? []).map { ItemId(jsString($0)) })
    )
}

private func loadTrip(_ raw: Any) -> Trip {
    let d = raw as? [String: Any] ?? [:]
    var archived: Bool?
    if let n = d["archived"] as? NSNumber, CFGetTypeID(n) == CFBooleanGetTypeID() { archived = n.boolValue }
    return Trip(
        id: TripId(field(d, "id").map(jsString) ?? ""),
        name: field(d, "name").map(jsString) ?? "",
        createdAt: field(d, "createdAt").map(jsString) ?? "",
        kitIds: dedupe((d["kitIds"] as? [Any] ?? []).map { KitId(jsString($0)) }),
        archived: archived,
        checked: Set((d["checked"] as? [Any] ?? []).map { ItemId(jsString($0)) })
    )
}

// MARK: - Saving (domain → JSON)

private func jsonQuote(_ s: String) -> String {
    var out = "\""
    for u in s.unicodeScalars {
        switch u {
        case "\"": out += "\\\""
        case "\\": out += "\\\\"
        case "\n": out += "\\n"
        case "\r": out += "\\r"
        case "\t": out += "\\t"
        case "\u{08}": out += "\\b"
        case "\u{0C}": out += "\\f"
        default:
            if u.value < 0x20 { out += String(format: "\\u%04x", u.value) } else { out.unicodeScalars.append(u) }
        }
    }
    return out + "\""
}

private func jsonArray(_ strings: [String], indent: String) -> String {
    if strings.isEmpty { return "[]" }
    let inner = indent + "  "
    return "[\n" + strings.map { inner + jsonQuote($0) }.joined(separator: ",\n") + "\n" + indent + "]"
}

private func jsonObject(_ pairs: [(String, String)], indent: String) -> String {
    let inner = indent + "  "
    return "{\n" + pairs.map { "\(inner)\(jsonQuote($0.0)): \($0.1)" }.joined(separator: ",\n") + "\n" + indent + "}"
}

private func jsonList(_ objects: [String], indent: String) -> String {
    if objects.isEmpty { return "[]" }
    let inner = indent + "  "
    return "[\n" + objects.map { inner + $0 }.joined(separator: ",\n") + "\n" + indent + "]"
}

/// Same shape and key order as the TS `storeToJson`: 2-space indent, trailing newline.
public func libraryToJson(_ library: Library) -> String {
    let i2 = "    ", i3 = "      "
    let items = library.items.map { item -> String in
        var pairs = [("id", jsonQuote(item.id.rawValue)), ("name", jsonQuote(item.name))]
        if let n = item.notes { pairs.append(("notes", jsonQuote(n))) }
        return jsonObject(pairs, indent: i2)
    }
    let kits = library.kits.map { kit in
        jsonObject([
            ("id", jsonQuote(kit.id.rawValue)),
            ("name", jsonQuote(kit.name)),
            ("itemIds", jsonArray(kit.itemIds.map(\.rawValue), indent: i3)),
        ], indent: i2)
    }
    let trips = library.trips.map { trip -> String in
        // JS default sort: UTF-16 code unit order.
        let checked = trip.checked.map(\.rawValue).sorted { $0.utf16.lexicographicallyPrecedes($1.utf16) }
        var pairs = [
            ("id", jsonQuote(trip.id.rawValue)),
            ("name", jsonQuote(trip.name)),
            ("createdAt", jsonQuote(trip.createdAt)),
            ("kitIds", jsonArray(trip.kitIds.map(\.rawValue), indent: i3)),
            ("checked", jsonArray(checked, indent: i3)),
        ]
        if let a = trip.archived { pairs.append(("archived", a ? "true" : "false")) }
        return jsonObject(pairs, indent: i2)
    }
    return jsonObject([
        ("items", jsonList(items, indent: "  ")),
        ("kits", jsonList(kits, indent: "  ")),
        ("trips", jsonList(trips, indent: "  ")),
    ], indent: "") + "\n"
}

/// Delete an item everywhere so kits and packing progress cannot retain dangling IDs.
public func deleteLibraryItem(_ library: Library, id: ItemId) -> Library {
    var l = library
    l.items.removeAll { $0.id == id }
    for i in l.kits.indices { l.kits[i].itemIds.removeAll { $0 == id } }
    for i in l.trips.indices { l.trips[i].checked.remove(id) }
    return l
}

/// Delete a kit from all trips while retaining the shared item library.
public func deleteLibraryKit(_ library: Library, id: KitId) -> Library {
    var l = library
    l.kits.removeAll { $0.id == id }
    for i in l.trips.indices { l.trips[i].kitIds.removeAll { $0 == id } }
    return l
}
