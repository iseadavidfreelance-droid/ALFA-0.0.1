import { createClient } from '@supabase/supabase-js';

// ¡PEGA AQUÍ TUS DATOS DE SUPABASE DEL PASO 3!
const supabaseUrl = 'https://vofcddffrblbpruhdgkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZmNkZGZmcmJsYnBydWhkZ2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzU4NDksImV4cCI6MjA4MjU1MTg0OX0.8BF6Sm-iwQw-t89ogBpnrNfJWLL5v8h1lYsVeaWwIl0';

export const supabase = createClient(supabaseUrl, supabaseKey);