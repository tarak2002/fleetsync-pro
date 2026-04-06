import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { vehiclesApi, driversApi, analyticsApi, complianceApi } from '../lib/api';

// Types
export interface Vehicle {
    id: string;
    vin: string;
    plate: string;
    make: string;
    model: string;
    year: number;
    color: string;
    status: 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'SUSPENDED';
    rego_expiry: string;
    ctp_expiry: string;
    pink_slip_expiry: string;
    weekly_rate: string;
    bond_amount: string;
    compliance: {
        rego: 'GREEN' | 'AMBER' | 'RED';
        ctp: 'GREEN' | 'AMBER' | 'RED';
        pink_slip: 'GREEN' | 'AMBER' | 'RED';
    };
    current_driver: Driver | null;
}

export interface Driver {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    license_no: string;
    vevo_status: 'PENDING' | 'APPROVED' | 'DENIED' | 'RESTRICTED';
    status: 'PENDING_APPROVAL' | 'ACTIVE' | 'BLOCKED' | 'INACTIVE';
    balance: string;
}

export interface DashboardStats {
    vehicles: { total: number; byStatus: Record<string, number> };
    drivers: { total: number; byStatus: Record<string, number> };
    rentals: { active: number };
    invoices: { pending: { count: number; total: number }; overdue: { count: number; total: number } };
    alerts: number;
}

export interface Alert {
    id: string;
    type: string;
    message: string;
    vehicle_id: string | null;
    resolved: boolean;
    created_at: string;
}

// Async thunks
export const fetchVehicles = createAsyncThunk('fleet/fetchVehicles', async () => {
    const response = await vehiclesApi.getAll();
    return response.data;
});

export const fetchDrivers = createAsyncThunk('fleet/fetchDrivers', async () => {
    const response = await driversApi.getAll();
    return response.data;
});

export const fetchDashboard = createAsyncThunk('fleet/fetchDashboard', async () => {
    const response = await analyticsApi.getDashboard();
    return response.data;
});

export const fetchAlerts = createAsyncThunk('fleet/fetchAlerts', async () => {
    const response = await complianceApi.getAlerts();
    return response.data;
});

// Slice
interface FleetState {
    vehicles: Vehicle[];
    drivers: Driver[];
    dashboard: DashboardStats | null;
    alerts: Alert[];
    loading: boolean;
    error: string | null;
}

const initialState: FleetState = {
    vehicles: [],
    drivers: [],
    dashboard: null,
    alerts: [],
    loading: false,
    error: null,
};

const fleetSlice = createSlice({
    name: 'fleet',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVehicles.pending, (state) => { state.loading = true; })
            .addCase(fetchVehicles.fulfilled, (state, action: PayloadAction<Vehicle[]>) => {
                state.loading = false;
                state.vehicles = action.payload;
            })
            .addCase(fetchVehicles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch vehicles';
            })
            .addCase(fetchDrivers.pending, (state) => { state.loading = true; })
            .addCase(fetchDrivers.fulfilled, (state, action: PayloadAction<Driver[]>) => {
                state.loading = false;
                state.drivers = action.payload;
            })
            .addCase(fetchDrivers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch drivers';
            })
            .addCase(fetchDashboard.pending, (state) => { state.loading = true; })
            .addCase(fetchDashboard.fulfilled, (state, action: PayloadAction<DashboardStats>) => {
                state.loading = false;
                state.dashboard = action.payload;
            })
            .addCase(fetchDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch dashboard stats';
            })
            .addCase(fetchAlerts.pending, (state) => { state.loading = true; })
            .addCase(fetchAlerts.fulfilled, (state, action: PayloadAction<Alert[]>) => {
                state.loading = false;
                state.alerts = action.payload;
            })
            .addCase(fetchAlerts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch alerts';
            });
    },
});

export const { clearError } = fleetSlice.actions;

// Auth slice
interface AuthUser {
    id: string;
    email: string;
    name?: string;
    role: string;
    driverId?: string;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    loading: boolean;
}

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        loading: true,
    } as AuthState,
    reducers: {
        setAuthUser: (state, action: PayloadAction<AuthUser | null>) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.loading = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
        },
    },
});

export const { setAuthUser, setLoading, logout: logoutAction } = authSlice.actions;

// Store
export const store = configureStore({
    reducer: {
        fleet: fleetSlice.reducer,
        auth: authSlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
