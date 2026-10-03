import { publishedWebsite } from "../../../cms/website";
export const dynamic = "force-static";
export function GET() { return Response.json({ revision: publishedWebsite.revision }); }
