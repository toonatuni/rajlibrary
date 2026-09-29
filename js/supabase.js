// ==========================================
// RAJ LIBRARY - SUPABASE CONFIGURATION
// ==========================================


// ==========================================
// SUPABASE PROJECT URL
// ==========================================

const SUPABASE_URL =
    "https://zkqimjvfmhoehwxejhih.supabase.co";


// ==========================================
// SUPABASE PUBLISHABLE KEY
// ==========================================

const SUPABASE_ANON_KEY =
    "sb_publishable_V8qrDovixN9YwcjnZkMhYQ_JLSkGO0l";


// ==========================================
// CREATE SUPABASE CLIENT
// ==========================================

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================
// MAKE CLIENT GLOBAL
// ==========================================

window.supabaseClient =
    supabaseClient;