import SwiftUI

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    /// Case-insensitive comparison key (TS `normalize`).
    var normalized: String { trimmed.lowercased() }

    /// Names are limited to 120 characters, like the TS inputs' `maxlength`.
    static let nameLimit = 120
    /// `self` cut to `nameLimit`. Settable, so a text binding enforces it: `$draft.capped`.
    var capped: String {
        get { count > Self.nameLimit ? String(prefix(Self.nameLimit)) : self }
        set { self = newValue.capped }
    }
}

/// "1 item", "3 items".
func plural(_ count: Int, _ noun: String) -> String {
    "\(count) \(noun)\(count == 1 ? "" : "s")"
}
