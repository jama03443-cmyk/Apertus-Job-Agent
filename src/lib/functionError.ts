export async function getFunctionError(error: unknown, fallback: string) {
  const functionError = error as { message?: string; context?: unknown };
  if (!(functionError.context instanceof Response)) {
    return functionError.message || fallback;
  }

  const responseText = await functionError.context.text();
  try {
    const responseBody = JSON.parse(responseText) as { error?: string; message?: string };
    return responseBody.error || responseBody.message || functionError.message || fallback;
  } catch {
    return responseText || functionError.message || fallback;
  }
}
