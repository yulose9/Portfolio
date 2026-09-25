import AdminRoot from "./ui/AdminRoot";

/*
 * /admin — a static shell. Everything real happens in the browser against
 * /api/admin, which Cloudflare Access guards and which checks the Access token
 * again itself. This HTML holds no data, so serving it proves nothing.
 */
export default function AdminPage() {
  return <AdminRoot />;
}
