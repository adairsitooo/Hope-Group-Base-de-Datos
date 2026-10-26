"use strict";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  window.HOPE_CONFIG.SUPABASE_URL,
  window.HOPE_CONFIG.SUPABASE_ANON_KEY
);

const form = document.getElementById("loginForm");
const button = document.getElementById("loginButton");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  button.disabled = true;
  message.textContent = "Verificando acceso...";

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("perfiles_acceso")
        .select("nombre, rol, activo")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || !profile.activo) {
      await supabaseClient.auth.signOut();
      throw new Error("Esta cuenta no tiene acceso autorizado.");
    }

    message.textContent =
      "Bienvenido, " + profile.nombre + ". Preparando el panel...";

    // El panel de gestión se añadirá en el siguiente paso.
    sessionStorage.setItem("hope_access", "authorized");
    window.location.href = "dashboard.html";

  } catch (error) {
    message.textContent =
      error.message || "No se pudo iniciar sesión.";
  } finally {
    button.disabled = false;
  }
});
