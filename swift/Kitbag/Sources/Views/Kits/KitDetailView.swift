import ObservableStore
import SwiftUI
import KitbagCore

/// One kit's screen: its items (drag the grip to reorder, long-press to remove) and an
/// add-or-create field with library suggestions.
struct KitDetailView: View {
    @EnvironmentObject var store: Store<AppModel>
    let kitId: KitId
    var autoFocus = false
    /// One-shot: the list clears the request once the field has been focused.
    var onAutoFocused: () -> Void = {}
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Text in the add-or-create field.
    @State private var query = ""
    @FocusState private var addFocused: Bool
    @State private var prompt: TextPrompt?
    @State private var pendingDelete: Kit?

    var body: some View {
        if let kit = store.state.data.kits.first(where: { $0.id == kitId }) {
            content(kit)
        } else {
            ContentUnavailableView("Kit not found", systemImage: "square.stack.3d.up.slash")
        }
    }

    private func content(_ kit: Kit) -> some View {
        let items = store.state.data.items
        let itemMap = Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let tripCount = kitUsage(store.state.data.kits, trips: store.state.data.trips)[kit.id] ?? 0
        let q = query.trimmed
        let exactMatch = q.isEmpty ? nil : findByName(q)

        return ScrollViewReader { proxy in
            List {
                Section {
                    ForEach(kit.itemIds, id: \.self) { id in
                        itemRow(kit, id: id, item: itemMap[id])
                            .themedRow()
                    }
                    .onMove { source, destination in
                        guard let from = source.first else { return }
                        // SwiftUI's destination counts the moved row; the core index doesn't.
                        let toIndex = destination > from ? destination - 1 : destination
                        guard toIndex != from else { return }
                        store.send(.moveItemInKit(kitId: kit.id, itemId: kit.itemIds[from], toIndex: toIndex))
                    }
                    if kit.itemIds.isEmpty {
                        Text("Nothing here yet. Type below to add items from your library or create new ones.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.inkDim)
                            .themedRow()
                    }
                } header: {
                    GroupHeader(title: "Items", count: plural(kit.itemIds.count, "item"))
                }

                Section {
                    addField(kit)
                        .id("add-field")
                        .themedRow()
                    ForEach(suggestions(kit)) { item in
                        Button { addItem(kit, item: item) } label: {
                            Label {
                                Text(item.name).foregroundStyle(Theme.ink)
                            } icon: {
                                Image(systemName: "plus.circle").foregroundStyle(Theme.accent)
                            }
                        }
                        .accessibilityLabel("Add \(item.name)")
                        .themedRow()
                    }
                    if !q.isEmpty && exactMatch == nil {
                        Button { addItem(kit) } label: {
                            Label("Create “\(q)”", systemImage: "plus.circle.fill")
                                .fontWeight(.semibold)
                        }
                        .themedRow()
                    } else if let exactMatch, kit.itemIds.contains(exactMatch.id) {
                        Label("Already in this kit.", systemImage: "checkmark.circle")
                            .font(.subheadline)
                            .foregroundStyle(Theme.inkDim)
                            .themedRow()
                    }
                } header: {
                    GroupHeader(title: "Add to kit")
                }
            }
            .themedScreen()
            // Always editing: the system reorder grip drags straight away, with no long press.
            .environment(\.editMode, .constant(.active))
            .animation(reduceMotion ? nil : .default, value: kit.itemIds)
            .animation(reduceMotion ? nil : .default, value: query)
            .onChange(of: kit.itemIds.count) { old, new in
                // Keep typing: the new row lands directly above the field.
                if new > old, addFocused { withAnimation(reduceMotion ? nil : .default) { proxy.scrollTo("add-field") } }
            }
        }
        .navigationTitle(kit.name)
        .navigationSubtitle(tripCount > 0 ? "Edits also update \(plural(tripCount, "trip"))" : "Ready for your next trip")
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button("Rename \(kit.name)", systemImage: "pencil") {
                    prompt = .renameKit(kit, store: store)
                }
                Button("Delete \(kit.name)", systemImage: "trash", role: .destructive) {
                    pendingDelete = kit
                }
            }
        }
        .textPrompt($prompt)
        .kitDeleteConfirmation($pendingDelete)
        .task {
            guard autoFocus else { return }
            // Let the push animation settle before raising the keyboard.
            try? await Task.sleep(for: .milliseconds(450))
            guard !Task.isCancelled else { return }
            addFocused = true
            onAutoFocused()
        }
    }

    private func itemRow(_ kit: Kit, id: ItemId, item: Item?) -> some View {
        let name = item?.name ?? "Missing item"
        let shared = store.state.data.kits
            .filter { $0.id != kit.id && $0.itemIds.contains(id) }
            .map(\.name)
        let detail = [item?.notes?.trimmed ?? "", shared.isEmpty ? "" : "Also in \(shared.joined(separator: ", "))"]
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
        let remove = { store.send(.removeItemFromKit(kitId: kit.id, itemId: id)) }

        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .foregroundStyle(Theme.ink)
                if !detail.isEmpty {
                    Text(detail)
                        .font(.subheadline)
                        .foregroundStyle(Theme.inkDim)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
        // The list is always editing (for the drag grip), which turns swipe actions
        // off, so Remove lives in the context menu.
        .contextMenu {
            Button("Remove from Kit", systemImage: "minus.circle", role: .destructive, action: remove)
        }
        .accessibilityActions {
            Button("Remove from Kit", action: remove)
            if let index = kit.itemIds.firstIndex(of: id) {
                if index > 0 {
                    Button("Move up") { store.send(.moveItemInKit(kitId: kit.id, itemId: id, toIndex: index - 1)) }
                }
                if index < kit.itemIds.count - 1 {
                    Button("Move down") { store.send(.moveItemInKit(kitId: kit.id, itemId: id, toIndex: index + 1)) }
                }
            }
        }
    }

    private func addField(_ kit: Kit) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "plus.circle.fill")
                .font(.title3)
                .foregroundStyle(Theme.accent)
                .accessibilityHidden(true)
            TextField("Add an item", text: $query)
                .foregroundStyle(Theme.ink)
                .focused($addFocused)
                .submitLabel(.done)
                .autocorrectionDisabled()
                .accessibilityLabel("Add item to \(kit.name)")
                .onSubmit { submit(kit) }
                .onKeyPress(.escape) {
                    query = ""
                    return .handled
                }
                .onChange(of: query) {
                    if query.count > 120 { query = String(query.prefix(120)) }
                }
        }
    }

    // MARK: logic (as in kits-view.ts)

    private func findByName(_ name: String) -> Item? {
        let wanted = name.normalized
        return store.state.data.items.first { $0.name.normalized == wanted }
    }

    /// Library items not yet in the kit; shown only while typing.
    private func suggestions(_ kit: Kit) -> [Item] {
        let q = query.normalized
        guard !q.isEmpty else { return [] }
        func rank(_ name: String) -> Int {
            let n = name.normalized
            return n == q ? 0 : n.hasPrefix(q) ? 1 : 2
        }
        let candidates = store.state.data.items.filter { !kit.itemIds.contains($0.id) && $0.name.lowercased().contains(q) }
        // Stable sort by rank (Array.sort isn't guaranteed stable).
        return candidates.enumerated()
            .sorted { (rank($0.element.name), $0.offset) < (rank($1.element.name), $1.offset) }
            .prefix(5)
            .map(\.element)
    }

    /// Add an existing library item, or create one from the typed name.
    private func addItem(_ kit: Kit, item: Item? = nil) {
        let name = query.trimmed
        guard item != nil || !name.isEmpty else { return }
        let id = item?.id ?? newItemId()
        if item == nil { store.send(.createItem(id: id, name: name)) }
        store.send(.addItemToKit(kitId: kit.id, itemId: id))
        query = ""
        addFocused = true
    }

    /// Return adds exactly what was typed: the library item with that name if
    /// one exists, otherwise a new item. Partial matches are tap-only.
    private func submit(_ kit: Kit) {
        let exact = findByName(query)
        if let exact, kit.itemIds.contains(exact.id) {
            addFocused = true
            return
        }
        addItem(kit, item: exact)
    }
}
