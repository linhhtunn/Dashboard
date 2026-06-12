import { jsonError, jsonOk } from "@/lib/api-response";
import { alertWorkflowStore } from "@/lib/operator/alert-workflow-store";

type RouteContext = {
  params: Promise<{ alertId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { alertId } = await context.params;
  const workflow = alertWorkflowStore.getWorkflow(alertId);

  if (!workflow) {
    return jsonError("Alert not found", 404);
  }

  return jsonOk({
    workflow,
    history: alertWorkflowStore.getHistory(alertId),
  });
}
