import { createClient } from '@supabase/supabase-js';

 const OLD_PROJECT_URL = 'https://woelvkuxkkhvausaoudk.supabase.co';
 const OLD_PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';
 
 // Prioritize the old project because it contains all the user's data and configuration
 // which were lost when the project was switched by the previous agent.
 const supabaseUrl = OLD_PROJECT_URL;
 const supabaseKey = OLD_PROJECT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
   auth: {
     persistSession: true,
     autoRefreshToken: true,
     detectSessionInUrl: true,
     flowType: 'pkce'
   }
 });
