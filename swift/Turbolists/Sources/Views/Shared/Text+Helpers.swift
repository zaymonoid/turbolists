import SwiftUI

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    /// Case-insensitive comparison key (TS `normalize`).
    var normalized: String { trimmed.lowercased() }
}

/// "1 item", "3 items".
func plural(_ count: Int, _ noun: String) -> String {
    "\(count) \(noun)\(count == 1 ? "" : "s")"
}
