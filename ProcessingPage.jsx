import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Spin } from "antd";
import axios from "axios";

export default function ProcessingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const merchantRef = params.get("merchant_reference");

  useEffect(() => {
    if (!merchantRef) return;

    const interval = setInterval(async () => {
      try {
        const backendUrl = import.meta.env.VITE_PAYFORT_BACKEND;

        const res = await axios.get(
          `${backendUrl}/api/payment-status/${merchantRef}`
        );

        const status = res.data.status;

        console.log("Polling status:", status);

        if (status === "SUCCESS") {
          clearInterval(interval);
          const data = res.data;

          if (data.status === "SUCCESS") {
            clearInterval(interval);

            navigate(`/checkout-result?` +
              `status=success` +
              `&merchant_reference=${merchantRef}` +
              `&amount=${data.amount}` +
              `&fort_id=${data.fort_id}` +
              `&customer_email=${encodeURIComponent(data.customer_email || "")}` +
              `&student_id=${data.student_id || ""}` +
              `&student_name=${encodeURIComponent(data.student_name || "")}` +
              `&cur_ygp=${encodeURIComponent(data.cur_ygp || "")}`
            );
          }
        }

        if (status === "FAILED") {
          clearInterval(interval);
          navigate(`/checkout-result?status=failed&merchant_reference=${merchantRef}`);
        }

        if (status === "POSTING_FAILED") {
          clearInterval(interval);
          navigate(`/checkout-result?status=posting_failed&merchant_reference=${merchantRef}`);
        }

      } catch (err) {
        console.error(err);
      }
    }, 3000); // every 3 seconds

    return () => clearInterval(interval);
  }, [merchantRef]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <Spin size="large" />
      <h2>Processing your payment...</h2>
      <p>Please do not refresh or close this page.</p>
    </div>
  );
}