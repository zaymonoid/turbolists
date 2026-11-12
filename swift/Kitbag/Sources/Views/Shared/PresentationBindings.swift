import SwiftUI

extension View {
    /// Keeps a one-level `NavigationStack` path in step with a store selection.
    ///
    /// The store is the source of truth. Its selection is applied to `path` in
    /// `onChange`, after the update that changed it: bound directly, a push that lands in
    /// the same update as a list insertion (create a kit, open it) is dropped by
    /// `NavigationStack`, leaving the store "open" on a screen that never appeared.
    /// Back and swipe-back report through `select`.
    func path<ID: Hashable>(
        _ path: Binding<[ID]>,
        follows selection: ID?,
        select: @escaping (ID?) -> Void
    ) -> some View {
        onChange(of: selection, initial: true) { _, id in
            let wanted = id.map { [$0] } ?? []
            if path.wrappedValue != wanted { path.wrappedValue = wanted }
        }
        .onChange(of: path.wrappedValue) { _, now in
            if now.last != selection { select(now.last) }
        }
    }
}

extension Binding {
    /// True while `self` holds `item`; set to false, it clears `self`.
    ///
    /// Attach a "present while non-nil" dialog to the row or button it is about, so
    /// its popover points there instead of floating over the whole screen:
    /// `.confirmationDialog(…, isPresented: $pendingDelete.presents(kit))`.
    func presents<Item: Identifiable>(_ item: Item) -> Binding<Bool> where Value == Item? {
        Binding<Bool>(
            get: { wrappedValue?.id == item.id },
            set: { if !$0, wrappedValue?.id == item.id { wrappedValue = nil } }
        )
    }
}
