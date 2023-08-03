//create a server for deno

import { serve } from "https://deno.land/std/http/server.ts";

console.log("http://localhost:8000/");

const a: string
a = 3 

serve(() => new Response(a+"Hello World\n"), { port: 8000 });