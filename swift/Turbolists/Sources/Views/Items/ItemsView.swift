import ObservableStore
import SwiftUI
import TurbolistsCore

/// The shared item library (port of `items-view.ts`).
struct ItemsView: View {
    @EnvironmentObject var store: Store<AppModel>
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var query = ""
    @State private var prompt: TextPrompt?
    @State private var pendingDelete: Item?
    @State private var scrollTarget: ItemId?

    private var items: [Item] { store.state.data.items }

    var body: some View {
        let usage = itemUsage(store.state.data.items, kits: store.state.data.kits)
        let q = query.normalized
        let filtered = q.isEmpty ? items : items.filter { $0.name.lowercased().contains(q) }

        NavigationStack {
            Group {
                if items.isEmpty {
                    EmptyState(
                        symbol: "tag",
                        badge: "plus.circle.fill",
                        title: "A place for everything",
                        message: "Add the things you pack. Reuse them across kits and trips without making duplicate lists."
                    ) {
                        Button("Add your first item", systemImage: "plus", action: add)
                            .buttonStyle(.pill)
                    }
                    .themedScreen()
                } else {
                    list(filtered, usage: usage)
                        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search items")
                        .overlay {
                            if filtered.isEmpty {
                                EmptyState(
                                    symbol: "magnifyingglass",
                                    title: "No matches",
                                    message: "Try another name, or add a new item."
                                ) {
                                    Button("Add item", systemImage: "plus", action: add)
                                        .buttonStyle(.pill)
                                }
                            }
                        }
                }
            }
            .navigationTitle("Items")
            .navigationSubtitle("Your library of things to bring.")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("New item", systemImage: "plus", action: add)
                }
            }
        }
        .textPrompt($prompt)
        .confirmationDialog(
            pendingDelete.map { "Delete “\($0.name)”?" } ?? "",
            isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
            titleVisibility: .visible,
            presenting: pendingDelete
        ) { item in
            Button("Delete", role: .destructive) { store.send(.deleteItem(id: item.id)) }
        } message: { item in
            let count = usage[item.id]?.count ?? 0
            Text(count > 0
                ? "This also removes it from \(plural(count, "kit")) and all packing checklists."
                : "This item will be removed from your library.")
        }
    }

    private func list(_ filtered: [Item], usage: [ItemId: Set<KitId>]) -> some View {
        ScrollViewReader { proxy in
            List {
                if !filtered.isEmpty {
                    Section {
                        ForEach(filtered) { item in
                            row(item, kitCount: usage[item.id]?.count ?? 0)
                                .id(item.id)
                                .themedRow()
                        }
                    } header: {
                        GroupHeader(title: "Library", count: plural(filtered.count, "item"))
                    }
                }
            }
            .themedScreen()
            .animation(reduceMotion ? nil : .default, value: filtered)
            // `initial`: the list may only now exist (first item, or adding from "No matches").
            .onChange(of: scrollTarget, initial: true) {
                guard let id = scrollTarget else { return }
                withAnimation(reduceMotion ? nil : .default) { proxy.scrollTo(id) }
                scrollTarget = nil
            }
        }
    }

    private func row(_ item: Item, kitCount: Int) -> some View {
        Button { rename(item) } label: {
            HStack(spacing: 12) {
                Text(item.name)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if kitCount > 0 {
                    Chip(text: plural(kitCount, "kit"), systemImage: "square.stack.3d.up.fill")
                } else {
                    Text("Not in a kit")
                        .font(.footnote)
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            .padding(.vertical, 4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(.rect)
        }
        .accessibilityLabel("Rename \(item.name)")
        .accessibilityValue(kitCount > 0 ? "In \(plural(kitCount, "kit"))" : "Not in a kit yet")
        .swipeActions(edge: .trailing) {
            Button("Delete \(item.name)", systemImage: "trash", role: .destructive) { pendingDelete = item }
                .tint(.red)
                .labelStyle(.iconOnly)
        }
        .swipeActions(edge: .leading) {
            Button("Rename", systemImage: "pencil") { rename(item) }
                .tint(Theme.accent)
        }
        .contextMenu {
            Button("Rename", systemImage: "pencil") { rename(item) }
            Button("Delete", systemImage: "trash", role: .destructive) { pendingDelete = item }
        }
        .accessibilityAction(named: "Delete \(item.name)") { pendingDelete = item }
    }

    private func add() {
        prompt = TextPrompt(
            title: "New item",
            placeholder: "e.g. Phone charger",
            initial: query.trimmed,
            confirm: "Add"
        ) { name in
            let id = newItemId()
            query = ""
            store.send(.createItem(id: id, name: name))
            scrollTarget = id
        }
    }

    private func rename(_ item: Item) {
        prompt = TextPrompt(title: "Rename item", initial: item.name) { name in
            store.send(.renameItem(id: item.id, name: name))
        }
    }
}
