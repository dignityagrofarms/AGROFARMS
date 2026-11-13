import { getRequest } from "@tanstack/react-start/server";
const actors = new WeakMap<Request, { username: string; role: string }>();
export async function setRequestActor(username: string, role: string) {
  actors.set(getRequest(), { username, role });
}
export function requestActor() {
  try {
    return actors.get(getRequest());
  } catch {
    return undefined;
  }
}
