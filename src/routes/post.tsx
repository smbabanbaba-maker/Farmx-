import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/post")({
  loader: () => {
    throw redirect({ to: "/post-product" });
  },
  component: SellRedirect,
});

function SellRedirect() {
  return null;
}
