import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    clinical_users: {
      executor: "constant-vus",
      vus: 50,
      duration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

const baseUrl = __ENV.BASE_URL;
const token = __ENV.SUPABASE_ACCESS_TOKEN;

export default function () {
  const headers = { Authorization: `Bearer ${token}` };
  const response = http.get(`${baseUrl}/api/alerts?limit=50`, { headers });
  check(response, { "alerts return 200": (result) => result.status === 200 });
  sleep(1);
}
