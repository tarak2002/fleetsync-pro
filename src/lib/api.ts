import axios from 'axios';
import { supabase } from './supabase';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API functions
export const authApi = {
    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },
    register: async (data: { email: string; password: string; name: string }) => {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.name,
                }
            }
        });
        if (error) throw error;
        return authData;
    },
    me: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },
    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
};

export const vehiclesApi = {
    getAll: () => api.get('/api/vehicles'),
    getAvailable: () => api.get('/api/vehicles/available'),
    getById: (id: string) => api.get(`/api/vehicles/${id}`),
    create: (data: any) => api.post('/api/vehicles', data),
    update: (id: string, data: any) => api.put(`/api/vehicles/${id}`, data),
    delete: (id: string) => api.delete(`/api/vehicles/${id}`),
    checkCompliance: (id: string) => api.post(`/api/vehicles/${id}/check-compliance`),
};

export const financeApi = {
    getDashboard: (params?: { start_date?: string; end_date?: string }) =>
        api.get('/api/finance/dashboard', { params }),
    getInsurance: () => api.get('/api/finance/insurance'),
};

export const driversApi = {
    getAll: (status?: string) => api.get('/api/drivers', { params: { status } }),
    getById: (id: string) => api.get(`/api/drivers/${id}`),
    create: (data: any) => api.post('/api/drivers', data),
    update: (id: string, data: any) => api.put(`/api/drivers/${id}`, data),
    delete: (id: string) => api.delete(`/api/drivers/${id}`),
    approve: (id: string) => api.post(`/api/drivers/${id}/approve`),
    block: (id: string) => api.post(`/api/drivers/${id}/block`),
    vevoCheck: (id: string) => api.post(`/api/drivers/${id}/vevo-check`),
};

export const rentalsApi = {
    getAll: (status?: string) => api.get('/api/rentals', { params: { status } }),
    getActive: () => api.get('/api/rentals/active'),
    getById: (id: string) => api.get(`/api/rentals/${id}`),
    create: (data: any) => api.post('/api/rentals', data),
    end: (id: string) => api.post(`/api/rentals/${id}/end`),
};

export const invoicesApi = {
    getAll: (params?: { status?: string; driver_id?: string }) =>
        api.get('/api/invoices', { params }),
    getById: (id: string) => api.get(`/api/invoices/${id}`),
    generate: (data: any) => api.post('/api/invoices/generate', data),
    pay: (id: string) => api.post(`/api/invoices/${id}/pay`),
    runBillingCycle: () => api.post('/api/invoices/run-billing-cycle'),
};

export const complianceApi = {
    check: () => api.post('/api/compliance/check'),
    getAlerts: () => api.get('/api/compliance/alerts'),
    resolveAlert: (id: string) => api.post(`/api/compliance/alerts/${id}/resolve`),
    getUpcomingExpiries: () => api.get('/api/compliance/upcoming-expiries'),
};

export const analyticsApi = {
    getDashboard: () => api.get('/api/analytics/dashboard'),
    getDriverEarnings: (driverId: string, weeks?: number) =>
        api.get(`/api/analytics/drivers/${driverId}/earnings`, { params: { weeks } }),
    getRoi: () => api.get('/api/analytics/roi'),
};

export const onboardingApi = {
    generateLink: (email: string) => api.post('/api/onboarding/generate-link', { email }),
    validate: (token: string) => api.get(`/api/onboarding/validate/${token}`),
    verify: (passportNo: string) => api.post('/api/onboarding/verify', { passportNo }),
};

export const driverDashboardApi = {
    getActiveRental: (driverId: string) =>
        api.get('/api/driver/dashboard/active-rental', { params: { driver_id: driverId } }),
    startShift: (data: { shift_id: string; vehicle_id: string; driver_id: string; damage_markers: any[]; notes: string; photos: string[] }) =>
        api.post('/api/driver/dashboard/start-shift', data),
    endShift: (shiftId: string) =>
        api.post('/api/driver/dashboard/end-shift', { shift_id: shiftId }),
    returnVehicle: (data: { rental_id: string; shift_id?: string }) =>
        api.post('/api/driver/dashboard/return-vehicle', data),
    reportAccident: (data: any) =>
        api.post('/api/driver/dashboard/accident-report', data),
};

export const businessApi = {
    getAll: () => api.get('/api/businesses'),
    getById: (id: string) => api.get(`/api/businesses/${id}`),
    create: (data: { name?: string; abn?: string; address?: string; phone?: string; email?: string }) =>
        api.post('/api/businesses', data),
    update: (id: string, data: Partial<{ name: string; abn: string; address: string; phone: string; email: string; is_active: boolean }>) =>
        api.patch(`/api/businesses/${id}`, data),
    delete: (id: string) => api.delete(`/api/businesses/${id}`),
    getVehicleDocs: (vehicleId: string) => api.get(`/api/businesses/vehicle-docs/${vehicleId}`),
    uploadVehicleDoc: (vehicleId: string, formData: FormData) =>
        api.post(`/api/businesses/vehicle-docs/${vehicleId}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteVehicleDoc: (vehicleId: string, docId: string) =>
        api.delete(`/api/businesses/vehicle-docs/${vehicleId}/${docId}`),
    getDocDownloadUrl: (vehicleId: string, docId: string) =>
        api.get(`/api/businesses/vehicle-docs/${vehicleId}/${docId}/download`),
    listVehicleDocs: (vehicleId: string) => api.get(`/api/documents/list/${vehicleId}`),
};
