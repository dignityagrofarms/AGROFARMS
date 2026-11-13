// Restricted roles can call only reviewed operational endpoints. Unknown endpoints fail closed.
export const restrictedOperationalFunctions = new Set([
  "getFinancialAccess",
  "adminListOrders",
  "adminOperationalOrders",
  "adminListBatches",
  "adminListActivities",
  "adminCreateActivity",
  "adminUpdateActivity",
  "adminDeleteActivity",
  "adminGetDailyLogDates",
  "adminCreateDailyLog",
  "adminUpdateDailyLog",
  "adminCreateFinancial",
  "adminListMySubmissions",
  "adminDismissMySubmission",
  "listRecordHistory",
  "getSubmissionChanges",
  "adminUpdateFinancial",
  "adminListTasks",
  "adminCreateTask",
  "adminCompleteTask",
  "adminDeleteTask",
  "adminUpdateOrder",
  "adminAssignOrderBatch",
  "staffClockIn",
  "staffSubmitLeaveRequest",
  "adminListLeaveRequests",
  "adminDecideLeaveRequest",
  "adminListAttendance",
  "adminMarkAttendance",
]);
export function operationalFunctionName(name: string) {
  return name.split("_createServerFn")[0];
}
export function mayUseRestrictedEndpoint(name: string) {
  return restrictedOperationalFunctions.has(operationalFunctionName(name));
}
// These fields are never needed to read farm operations. Unstructured text and files may contain money.
const privateOperationalKeys = new Set([
  "fundingPerBird",
  "funding_per_bird",
  "notes",
  "receiptUrl",
  "photoUrl",
  "attachmentName",
  "referenceNo",
  "rejectionReason",
  "causeOfMortality",
  "statusNote",
]);
export function operationalProjection(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(operationalProjection);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        privateOperationalKeys.has(key)
          ? null
          : key === "description" &&
              typeof v === "string" &&
              /(?:₦|NGN|naira|\b(?:price|salary|cost|payment|pay|sale|sold|expense)\b)/i.test(v)
            ? "Financial task details restricted"
            : operationalProjection(v),
      ]),
    );
  return value;
}
