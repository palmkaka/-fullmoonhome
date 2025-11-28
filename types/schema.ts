import { Timestamp } from "firebase/firestore";

export interface User {
    uid: string;
    email: string;
    role: 'admin' | 'tenant';
    created_at: Timestamp;
    profile_image_url?: string;
}

export interface HostelSettings {
    name: string;
    address: string;
    water_unit_price: number;
    electric_unit_price: number;
    water_calculation_method: 'unit' | 'person'; // 'unit' = per meter unit, 'person' = flat rate per person
    water_price_per_person: number;
    late_fee_per_day: number;
    bank_account_info: {
        bank_name: string;
        account_number: string;
        account_name: string;
    };
}

export interface Room {
    room_number: string;
    floor: number;
    type: 'standard_fan' | 'standard_air' | 'suite';
    base_price: number;
    status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
    current_tenant_id: string | null;
    facilities: string[];
}

export interface Tenant {
    tenant_id: string;
    full_name: string;
    id_card_number: string;
    phone_number: string;
    emergency_contact: {
        name: string;
        phone: string;
        relation: string;
    };
    current_room_id: string;
    contract_start_date: Timestamp;
    contract_end_date: Timestamp;
    deposit_amount: number;
    documents: {
        type: string;
        url: string;
    }[];
}

export interface MeterReading {
    reading_id: string;
    room_id: string;
    month: number;
    year: number;
    water_meter_value: number;
    electric_meter_value: number;
    recorded_by: string;
    recorded_at: Timestamp;
}

export interface Invoice {
    invoice_id: string;
    room_id: string;
    tenant_id: string;
    month: number;
    year: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    items: {
        name: string;
        amount: number;
    }[];
    total_amount: number;
    due_date: Timestamp;
    payment_proof_url: string | null;
    paid_at: Timestamp | null;
}

export interface MaintenanceRequest {
    request_id: string;
    room_id: string;
    tenant_id: string;
    title: string;
    description: string;
    images: string[];
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: Timestamp;
}
