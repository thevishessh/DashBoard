import RequestForm from "@/components/requests/RequestForm";

export const dynamic = "force-dynamic";

export default function RequestPage() {
  return (
    <>
      <h1>Raise a request</h1>
      <p className="mt-2 text-ink-2">
        Tell the Registrar Office what you need. You will get a reference to check the status later.
      </p>
      <div className="mt-8">
        <RequestForm />
      </div>
    </>
  );
}
