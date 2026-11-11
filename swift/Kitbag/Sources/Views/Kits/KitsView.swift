import ObservableStore
import SwiftUI
import KitbagCore

/// Kit list and navigation into a kit (port of `kits-view.ts`).
/// The open kit is the store's `selectedKitId`.
struct KitsView: View {
    @EnvironmentObject var store: Store<AppModel>
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var query = ""
    @State private var prompt: TextPrompt?
    @State private var pendingDelete: Kit?
    /// Focus the add field once a newly created kit's screen appears.
    @State private var focusNewKit: KitId?

    private var kits: [Kit] { store.state.data.kits }

    /// The navigation path mirrors `selectedKitId` (ignoring a stale selection).
    private var path: Binding<[KitId]> {
        Binding(
            get: {
                guard let id = store.state.selectedKitId, kits.contains(where: { $0.id == id }) else { return [] }
                return [id]
            },
            set: {
                if $0.isEmpty { focusNewKit = nil }
                store.send(.selectKit($0.last))
            }
        )
    }

    var body: some View {
        NavigationStack(path: path) {
            content
                .navigationTitle("Kits")
                .navigationSubtitle("Pack for every part of your trip.")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button("New kit", systemImage: "plus", action: add)
                    }
                }
                .navigationDestination(for: KitId.self) { id in
                    KitDetailView(kitId: id, autoFocus: focusNewKit == id) { focusNewKit = nil }
                }
        }
        .textPrompt($prompt)
        .kitDeleteConfirmation($pendingDelete)
    }

    @ViewBuilder
    private var content: some View {
        let itemNames = Dictionary(store.state.data.items.map { ($0.id, $0.name) }, uniquingKeysWith: { a, _ in a })
        let usage = kitUsage(kits, trips: store.state.data.trips)
        let search = query.normalized
        let namesOf = { (kit: Kit) in kit.itemIds.compactMap { itemNames[$0] } }
        let matching = search.isEmpty ? kits : kits.filter { kit in
            kit.name.lowercased().contains(search) || namesOf(kit).contains { $0.lowercased().contains(search) }
        }

        if kits.isEmpty {
            EmptyState(
                symbol: "square.stack.3d.up",
                badge: "plus.circle.fill",
                title: "Build once. Pack again.",
                message: "Group items into kits like Essentials or Beach. Combine them for a trip and we’ll handle the overlap."
            ) {
                Button("Create your first kit", systemImage: "plus", action: add)
                    .buttonStyle(.pill)
                Text("Want a head start?")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkDim)
                    .padding(.top, 14)
                Button("Start with 6 essentials", systemImage: "sparkles", action: useEssentials)
                    .fontWeight(.semibold)
            }
            .themedScreen()
        } else {
            List {
                ForEach(matching) { kit in
                    let names = namesOf(kit)
                    // Lead with the items that made this kit match the search.
                    let preview = search.isEmpty ? names
                        : names.filter { $0.lowercased().contains(search) } + names.filter { !$0.lowercased().contains(search) }
                    Button { store.send(.selectKit(kit.id)) } label: {
                        KitCard(kit: kit, tripCount: usage[kit.id] ?? 0, preview: preview, search: search)
                    }
                    .buttonStyle(CardButtonStyle())
                    .cardRow()
                    .contextMenu {
                        Button("Rename", systemImage: "pencil") { rename(kit) }
                        Button("Delete", systemImage: "trash", role: .destructive) { pendingDelete = kit }
                    }
                    .swipeActions(edge: .trailing) {
                        Button("Delete", systemImage: "trash", role: .destructive) { pendingDelete = kit }
                            .tint(.red)
                            .labelStyle(.iconOnly)
                    }
                    // Swipe actions already appear as VoiceOver actions; Rename is only in the context menu.
                    .accessibilityAction(named: "Rename") { rename(kit) }
                }
            }
            .listStyle(.plain)
            .themedScreen()
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search kits or their items")
            .overlay {
                if matching.isEmpty {
                    EmptyState(
                        symbol: "magnifyingglass",
                        title: "No kits found",
                        message: "Search by a kit name or an item it contains."
                    ) {
                        Button("Clear search") { query = "" }.fontWeight(.semibold)
                    }
                }
            }
            .animation(reduceMotion ? nil : .default, value: matching)
        }
    }

    private func add() {
        prompt = TextPrompt(
            title: "New kit",
            message: "A kit is a reusable group of items, like Essentials, Beach, or Cold weather.",
            placeholder: "e.g. Essentials",
            initial: query.trimmed,
            confirm: "Add"
        ) { name in
            let id = newKitId()
            store.send(.createKit(id: id, name: name))
            query = ""
            focusNewKit = id
            store.send(.selectKit(id))
        }
    }

    private func useEssentials() {
        let id = newKitId()
        store.send(.createKit(id: id, name: "Essentials"))
        for name in ["Phone charger", "Toothbrush", "Toothpaste", "Underwear", "Socks", "ID & wallet"] {
            let itemId: ItemId
            if let existing = store.state.data.items.first(where: { $0.name.normalized == name.normalized }) {
                itemId = existing.id
            } else {
                itemId = newItemId()
                store.send(.createItem(id: itemId, name: name))
            }
            store.send(.addItemToKit(kitId: id, itemId: itemId))
        }
        store.send(.selectKit(id))
    }

    private func rename(_ kit: Kit) {
        prompt = .renameKit(kit, store: store)
    }
}

/// One kit in the list: an icon tile, name and usage, and its items as chips.
private struct KitCard: View {
    var kit: Kit
    var tripCount: Int
    var preview: [String]
    var search: String

    @ScaledMetric(relativeTo: .title3) private var tile: CGFloat = 44
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        // At accessibility sizes the tile goes above the name so the name keeps its width.
        let header = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10))
            : AnyLayout(HStackLayout(spacing: 14))
        VStack(alignment: .leading, spacing: 0) {
            header {
                RoundedRectangle(cornerRadius: tile * 0.3)
                    .fill(Theme.accent.opacity(0.14))
                    .frame(width: tile, height: tile)
                    .overlay {
                        Image(systemName: "square.stack.3d.up.fill")
                            .font(.system(size: tile * 0.42, weight: .medium))
                            .foregroundStyle(Theme.accent)
                    }
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text(kit.name)
                        .font(Theme.cardTitle())
                        .tracking(-0.4)
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.leading)
                    Text(plural(kit.itemIds.count, "item") + (tripCount > 0 ? " · Used in \(plural(tripCount, "trip"))" : ""))
                        .font(.subheadline)
                        .foregroundStyle(Theme.inkDim)
                }
                if !typeSize.isAccessibilitySize {
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            if !preview.isEmpty {
                OverflowRow {
                    ForEach(Array(preview.prefix(12).enumerated()), id: \.offset) { _, name in
                        let hit = !search.isEmpty && name.lowercased().contains(search)
                        Chip(text: name,
                             tint: hit ? Theme.accent : Theme.inkDim,
                             fill: hit ? Theme.accent.opacity(0.14) : Theme.raised)
                    }
                }
                .padding(.top, 14)
            }
        }
        .card(padding: 16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(kit.name)
        .accessibilityValue(
            ([plural(kit.itemIds.count, "item")] + (tripCount > 0 ? ["used in \(plural(tripCount, "trip"))"] : []))
                .joined(separator: ", ")
                + (preview.isEmpty ? "" : ". " + preview.joined(separator: ", "))
        )
    }
}

// MARK: - Shared kit prompts (list context menu and detail screen)

extension TextPrompt {
    @MainActor
    static func renameKit(_ kit: Kit, store: Store<AppModel>) -> TextPrompt {
        TextPrompt(title: "Rename kit", initial: kit.name) { name in
            store.send(.renameKit(id: kit.id, name: name))
        }
    }
}

extension View {
    /// Usage-aware "Delete kit" confirmation. Deleting the open kit clears the
    /// selection in the reducer, which pops its screen.
    func kitDeleteConfirmation(_ kit: Binding<Kit?>) -> some View {
        modifier(KitDeleteConfirmation(kit: kit))
    }
}

private struct KitDeleteConfirmation: ViewModifier {
    @EnvironmentObject var store: Store<AppModel>
    @Binding var kit: Kit?

    func body(content: Content) -> some View {
        content.confirmationDialog(
            kit.map { "Delete “\($0.name)”?" } ?? "",
            isPresented: Binding(get: { kit != nil }, set: { if !$0 { kit = nil } }),
            titleVisibility: .visible,
            presenting: kit
        ) { kit in
            Button("Delete", role: .destructive) { store.send(.deleteKit(id: kit.id)) }
        } message: { kit in
            let count = kitUsage(store.state.data.kits, trips: store.state.data.trips)[kit.id] ?? 0
            Text("Your items stay in the library." + (count > 0 ? " This kit will also be removed from \(plural(count, "trip"))." : ""))
        }
    }
}
