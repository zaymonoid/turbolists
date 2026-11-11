import ObservableStore
import SwiftUI
import TurbolistsCore

/// Kit setup (right after creating a trip) or full trip settings.
struct TripSettingsSheet: View {
    let tripId: TripId
    let mode: TripSheet
    let toggleArchived: (Trip) -> Void
    /// Delete runs after the sheet is gone, since it also pops the trip.
    let onDelete: () -> Void

    @EnvironmentObject private var store: Store<AppModel>
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var confirmingDelete = false
    @FocusState private var nameFocused: Bool

    private var trip: Trip? { store.state.data.trips.first { $0.id == tripId } }
    private var setup: Bool { mode == .setup }

    var body: some View {
        NavigationStack {
            Form {
                if let trip {
                    if !setup {
                        Section {
                            TextField("Trip name", text: $name.capped)
                                .foregroundStyle(Theme.ink)
                                .focused($nameFocused)
                                .submitLabel(.done)
                                .onSubmit(commitName)
                                .accessibilityLabel("Trip name")
                                .sheetRow()
                        } header: {
                            GroupHeader(title: "Name")
                        }
                    }
                    kitSection(trip)
                    if !setup {
                        Section {
                            let archived = trip.archived ?? false
                            Button(archived ? "Restore trip" : "Archive trip",
                                   systemImage: archived ? "tray.and.arrow.up" : "archivebox") {
                                // Commit a pending rename first: a later rename would clear the Undo.
                                commitName()
                                toggleArchived(trip)
                                dismiss()
                            }
                            .sheetRow()
                            Button("Delete trip", systemImage: "trash", role: .destructive) {
                                confirmingDelete = true
                            }
                            .foregroundStyle(Theme.danger)
                            .sheetRow()
                        }
                        .confirmationDialog("Delete “\(trip.name)”?", isPresented: $confirmingDelete,
                                            titleVisibility: .visible) {
                            Button("Delete", role: .destructive) {
                                onDelete()
                                dismiss()
                            }
                        } message: {
                            Text("This packing list and its progress will be removed. Your kits and items stay in your library.")
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle(setup ? "What kind of trip?" : "Trip settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents(setup ? [.medium, .large] : [.large])
        .presentationDragIndicator(.visible)
        .onAppear { name = trip?.name ?? "" }
        .onChange(of: nameFocused) { if !nameFocused { commitName() } }
        .onDisappear(perform: commitName)
    }

    @ViewBuilder private func kitSection(_ trip: Trip) -> some View {
        let kits = store.state.data.kits
        Section {
            if kits.isEmpty {
                Text("Create a kit first, then add it here.")
                    .foregroundStyle(Theme.inkDim)
                    .sheetRow()
                Button("Create a kit", systemImage: "plus") {
                    dismiss()
                    store.send(.setView(.kits))
                }
                .fontWeight(.semibold)
                .sheetRow()
            } else {
                ForEach(kits) { kit in
                    let active = trip.kitIds.contains(kit.id)
                    Button {
                        store.send(active
                            ? .removeKitFromTrip(tripId: trip.id, kitId: kit.id)
                            : .addKitToTrip(tripId: trip.id, kitId: kit.id))
                    } label: {
                        HStack(spacing: 14) {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(active ? Theme.accent.opacity(0.16) : Theme.raised)
                                .frame(width: 36, height: 36)
                                .overlay {
                                    Image(systemName: "square.stack.3d.up.fill")
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundStyle(active ? Theme.accent : Theme.inkFaint)
                                }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(kit.name)
                                    .fontWeight(.medium)
                                    .foregroundStyle(Theme.ink)
                                Text("\(kit.itemIds.count) item\(kit.itemIds.count == 1 ? "" : "s")")
                                    .font(.footnote)
                                    .foregroundStyle(Theme.inkDim)
                            }
                            Spacer()
                            CheckBox(checked: active)
                        }
                        .padding(.vertical, 2)
                        .contentShape(Rectangle())
                        .animation(.snappy, value: active)
                    }
                    .buttonStyle(.plain)
                    .sheetRow()
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(kit.name), \(kit.itemIds.count) item\(kit.itemIds.count == 1 ? "" : "s")")
                    .accessibilityValue(active ? "In this trip" : "Not in this trip")
                    .accessibilityAddTraits(active ? [.isToggle, .isSelected] : .isToggle)
                }
            }
        } header: {
            GroupHeader(title: "Kits")
        } footer: {
            Text("Choose what fits this trip. Shared items appear just once.")
                .foregroundStyle(Theme.inkDim)
        }
    }

    private func commitName() {
        guard let trip else { return }
        let trimmed = name.tripTrimmed
        if !trimmed.isEmpty, trimmed != trip.name {
            store.send(.renameTrip(id: trip.id, name: String(trimmed.prefix(120))))
        } else if trimmed.isEmpty {
            name = trip.name
        }
    }
}
