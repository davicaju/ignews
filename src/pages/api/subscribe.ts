import { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "../../services/stripe";

import { getSession } from "next-auth/client";
import { fauna } from "../../services/fauna";

import { query as q } from "faunadb";

type User = {
  ref: {
    id: String;
  };
  data: {
    stripe_customer_id: string;
  };
};

export default async function checkout(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const session = await getSession({ req });

    const user = await fauna.query<User>(
      q.Get(q.Match(q.Index("user_by_email"), q.Casefold(session.user.email)))
    );

    let costumerId = user.data.stripe_customer_id;

    if (!costumerId) {
      const stripeCostumer = await stripe.customers.create({
        email: session.user.email,
      });

      await fauna.query(
        q.Update(q.Ref(q.Collection("users"), user.ref.id), {
          data: {
            stripe_customer_id: stripeCostumer.id,
          },
        })
      );

      costumerId = stripeCostumer.id;
    }

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: costumerId,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [{ price: "price_1LFQpnDmUH8kPLw3WaarCD3H", quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    return res.status(200).json({ sessionId: stripeCheckoutSession.id });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method now allowed");
  }
}
