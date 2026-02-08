/**
 * La Tía Julia - Configuración de Supabase
 * Base de datos compartida para productos
 */

const SUPABASE_URL = 'https://snydytvjircbkzwjtoqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueWR5dHZqaXJjYmt6d2p0b3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTc3NDcsImV4cCI6MjA4NTg5Mzc0N30.4FP9js6svU1FYKx02gtL4EgTlUuQitttU2gaAIwklKk';

// Crear cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso global
window.supabaseClient = supabaseClient;
