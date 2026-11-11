import Foundation

/// Merges item lists from the trip's selected kits, preserving sub-ordering
/// within each kit. Items in multiple kits appear at their first occurrence only.
public func tripChecklist(_ trip: Trip, kits: [Kit]) -> [ItemId] {
    var seen = Set<ItemId>()
    var result: [ItemId] = []
    var kitMap: [KitId: Kit] = [:]
    for k in kits { kitMap[k.id] = k }  // last wins, as in JS Map
    for kitId in trip.kitIds {
        guard let kit = kitMap[kitId] else { continue }
        for itemId in kit.itemIds where seen.insert(itemId).inserted { result.append(itemId) }
    }
    return result
}

public struct PackProgress: Equatable, Sendable {
    public var checked: Int
    public var total: Int
    public init(checked: Int, total: Int) { self.checked = checked; self.total = total }
}

public func packProgress(_ trip: Trip, kits: [Kit]) -> PackProgress {
    let checklist = Set(tripChecklist(trip, kits: kits))
    let checked = trip.checked.filter { checklist.contains($0) }.count
    return PackProgress(checked: checked, total: checklist.count)
}

private func collapseWhitespace(_ s: String) -> String {
    s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
}

/// A portable checklist, independent of the current search or unpacked filter.
public func formatTripChecklist(_ trip: Trip, kits: [Kit], items: [Item]) -> String {
    var itemMap: [ItemId: Item] = [:]
    for i in items { itemMap[i.id] = i }
    let checklist = tripChecklist(trip, kits: kits).compactMap { itemMap[$0] }
    let checked = checklist.filter { trip.checked.contains($0.id) }.count
    let lines = checklist.map { item -> String in
        let name = collapseWhitespace(item.name)
        var notes = ""
        if let n = item.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !n.isEmpty {
            notes = n.replacingOccurrences(of: "\r\n", with: "\n")
                .components(separatedBy: "\n").map { "    \($0)" }.joined(separator: "\n")
        }
        return "- [\(trip.checked.contains(item.id) ? "x" : " ")] \(name)\(notes.isEmpty ? "" : "\n" + notes)"
    }
    let text = ([trip.name, "\(checked) of \(checklist.count) packed", ""] + lines).joined(separator: "\n")
    // trimEnd
    var end = text.endIndex
    while end > text.startIndex, text[text.index(before: end)].isWhitespace { end = text.index(before: end) }
    return String(text[..<end])
}

public func kitUsage(_ kits: [Kit], trips: [Trip]) -> [KitId: Int] {
    var usage: [KitId: Int] = [:]
    for kit in kits { usage[kit.id] = 0 }
    for trip in trips {
        for kitId in trip.kitIds where usage[kitId] != nil { usage[kitId]! += 1 }
    }
    return usage
}

public func itemUsage(_ items: [Item], kits: [Kit]) -> [ItemId: Set<KitId>] {
    var usage: [ItemId: Set<KitId>] = [:]
    for item in items { usage[item.id] = [] }
    for kit in kits {
        for itemId in kit.itemIds where usage[itemId] != nil { usage[itemId]!.insert(kit.id) }
    }
    return usage
}
