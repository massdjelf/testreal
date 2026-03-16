import { create } from "zustand"

export type ViewType = "landing" | "map" | "property" | "admin" | "vendor"

interface AppState {
  // Auth state
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    name: string | null
    role: string
  } | null
  
  // View state
  currentView: ViewType
  selectedPropertyId: string | null
  
  // Map state
  mapCenter: { lat: number; lng: number }
  mapZoom: number
  searchQuery: string
  selectedState: string | null
  selectedCity: string | null
  
  // Filter state
  statusFilter: string | null
  typeFilter: string | null
  priceRange: [number, number]
  
  // Actions
  setUser: (user: AppState["user"]) => void
  setAuthenticated: (value: boolean) => void
  setCurrentView: (view: ViewType) => void
  setSelectedProperty: (id: string | null) => void
  setMapCenter: (center: { lat: number; lng: number }) => void
  setMapZoom: (zoom: number) => void
  setSearchQuery: (query: string) => void
  setSelectedState: (state: string | null) => void
  setSelectedCity: (city: string | null) => void
  setStatusFilter: (status: string | null) => void
  setTypeFilter: (type: string | null) => void
  setPriceRange: (range: [number, number]) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  currentView: "landing",
  selectedPropertyId: null,
  mapCenter: { lat: 39.8283, lng: -98.5795 }, // Center of USA
  mapZoom: 4,
  searchQuery: "",
  selectedState: null,
  selectedCity: null,
  statusFilter: null,
  typeFilter: null,
  priceRange: [0, 10000000],
  
  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProperty: (id) => set({ selectedPropertyId: id }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedState: (state) => set({ selectedState: state }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setTypeFilter: (type) => set({ typeFilter: type }),
  setPriceRange: (range) => set({ priceRange: range }),
  logout: () => set({
    isAuthenticated: false,
    user: null,
    currentView: "landing",
    selectedPropertyId: null,
  }),
}))
