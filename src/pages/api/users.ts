import { NextApiRequest, NextApiResponse } from "next";

export default function users(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const users = [
    { id: 1, name: "Davi" },
    { id: 2, name: "Miguel" },
    { id: 3, name: "Luzia" },
  ];

  return response.json(users);
}
