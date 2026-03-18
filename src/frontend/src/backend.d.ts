import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PhotoData {
    imageData: string;
    timestamp: bigint;
}
export interface QCReport {
    id: bigint;
    title: string;
    date: bigint;
    submittedTimestamp: bigint;
    operatorRows: Array<OperatorRow>;
}
export interface OperatorRow {
    defectType: string;
    operationName: string;
    defectCounts: Array<bigint>;
    operatorName: string;
    numberOfDefects: bigint;
    photo?: PhotoData;
    actionTaken: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearDraftReport(): Promise<void>;
    deleteReport(id: bigint): Promise<void>;
    getAllReports(): Promise<Array<QCReport>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDraftReport(): Promise<QCReport | null>;
    getReportById(id: bigint): Promise<QCReport | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveDraftReport(title: string, date: bigint, operatorRows: Array<OperatorRow>): Promise<void>;
    saveReport(title: string, date: bigint, operatorRows: Array<OperatorRow>): Promise<bigint>;
}
