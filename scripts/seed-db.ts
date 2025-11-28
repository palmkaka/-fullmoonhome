import './load-env';
import { adminDb, adminAuth } from "../lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

console.log("Service Account Key Length:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length : "Undefined");


async function seed() {
    console.log("Starting database seed...");

    try {
        // 1. Create Admin User
        const adminEmail = "admin@hostel.com";
        const adminPassword = "password123";
        let adminUid;

        try {
            const user = await adminAuth.getUserByEmail(adminEmail);
            adminUid = user.uid;
            console.log("Admin user already exists");
        } catch (e) {
            const user = await adminAuth.createUser({
                email: adminEmail,
                password: adminPassword,
                displayName: "System Admin",
            });
            adminUid = user.uid;
            console.log("Created admin user");
        }

        await adminDb.collection("users").doc(adminUid).set({
            uid: adminUid,
            email: adminEmail,
            role: "admin",
            created_at: Timestamp.now(),
        });

        // 2. Global Config
        await adminDb.collection("hostel_settings").doc("config").set({
            name: "Full Moon Hostel",
            address: "123 Moon Street, Bangkok",
            water_unit_price: 18,
            electric_unit_price: 8,
            late_fee_per_day: 50,
            bank_account_info: {
                bank_name: "K-Bank",
                account_number: "123-4-56789-0",
                account_name: "Full Moon Hostel Co., Ltd.",
            },
        });
        console.log("Set global config");

        // 3. Rooms (10 rooms, 2 types)
        const roomTypes = ["standard_fan", "standard_air"];
        const facilities = ["bed", "wardrobe", "desk"];

        for (let i = 1; i <= 10; i++) {
            const floor = i <= 5 ? 1 : 2;
            const roomNum = `10${i}`; // 101-110
            const type = i % 2 === 0 ? "standard_air" : "standard_fan";
            const price = type === "standard_air" ? 4500 : 3500;

            await adminDb.collection("rooms").doc(roomNum).set({
                room_number: roomNum,
                floor: floor,
                type: type,
                base_price: price,
                status: "vacant",
                current_tenant_id: null,
                facilities: facilities,
            });
        }
        console.log("Created 10 rooms");

        // 4. Tenants (3 Active)
        const tenants = [
            { name: "Somchai Jai-dee", room: "101", email: "somchai@test.com" },
            { name: "Somsri Rak-dee", room: "102", email: "somsri@test.com" },
            { name: "John Doe", room: "103", email: "john@test.com" },
        ];

        for (const t of tenants) {
            let uid;
            try {
                const user = await adminAuth.getUserByEmail(t.email);
                uid = user.uid;
            } catch {
                const user = await adminAuth.createUser({
                    email: t.email,
                    password: "password123",
                    displayName: t.name,
                });
                uid = user.uid;
            }

            // User Profile
            await adminDb.collection("users").doc(uid).set({
                uid: uid,
                email: t.email,
                role: "tenant",
                created_at: Timestamp.now(),
            });

            // Tenant Profile
            await adminDb.collection("tenants").doc(uid).set({
                tenant_id: uid,
                full_name: t.name,
                id_card_number: "1234567890123",
                phone_number: "0812345678",
                emergency_contact: { name: "Mom", phone: "0899999999", relation: "Mother" },
                current_room_id: t.room,
                contract_start_date: Timestamp.now(),
                contract_end_date: Timestamp.fromDate(new Date(2025, 11, 31)),
                deposit_amount: 5000,
                documents: [],
            });

            // Update Room
            await adminDb.collection("rooms").doc(t.room).update({
                status: "occupied",
                current_tenant_id: uid,
            });

            // 5. Invoices (1 Paid, 1 Pending for first tenant)
            if (t.name === "Somchai Jai-dee") {
                // Paid Invoice
                await adminDb.collection("invoices").add({
                    room_id: t.room,
                    tenant_id: uid,
                    month: 10,
                    year: 2025,
                    status: "paid",
                    items: [{ name: "Room Rent", amount: 3500 }],
                    total_amount: 3500,
                    due_date: Timestamp.fromDate(new Date(2025, 10, 5)),
                    payment_proof_url: "https://example.com/slip.jpg",
                    paid_at: Timestamp.fromDate(new Date(2025, 10, 4)),
                });

                // Pending Invoice
                await adminDb.collection("invoices").add({
                    room_id: t.room,
                    tenant_id: uid,
                    month: 11,
                    year: 2025,
                    status: "pending",
                    items: [{ name: "Room Rent", amount: 3500 }],
                    total_amount: 3500,
                    due_date: Timestamp.fromDate(new Date(2025, 11, 5)),
                    payment_proof_url: null,
                    paid_at: null,
                });
            }
        }
        console.log("Created tenants and invoices");

        console.log("Database seed completed successfully.");
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();
