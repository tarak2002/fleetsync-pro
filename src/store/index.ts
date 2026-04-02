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
interface AuthState {
    user: { id: string; email: string; name: string; role: string } | null;
    token: string | null;
    isAuthenticated: boolean;
}

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
        isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
    } as AuthState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: AuthState['user']; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            localStorage.setItem('token', action.payload.token);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;

// Store
export const store = configureStore({
    reducer: {
        fleet: fleetSlice.reducer,
        auth: authSlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
