<script>
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, phone, password })
			});
			const data = await res.json();
			if (!res.ok) { error = data.error; return; }
			window.location.href = '/dashboard';
		} catch { error = 'Erreur d\'inscription'; }
		finally { loading = false; }
	}
</script>

<div class="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
	<div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Inscription</h1>
			<p class="text-gray-500 mt-2">Créez votre compte MyBike Djo</p>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			{#if error}
				<div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
			{/if}
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
				<input id="name" type="text" bind:value={name} required class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Votre nom" />
			</div>
			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input id="email" type="email" bind:value={email} required class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="email@exemple.com" />
			</div>
			<div>
				<label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
				<input id="phone" type="tel" bind:value={phone} class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="0555 12 34 56" />
			</div>
			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
				<input id="password" type="password" bind:value={password} required class="w-full rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="••••••••" />
			</div>
			<button type="submit" disabled={loading} class="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50">
				{loading ? 'Inscription...' : 'S\'inscrire'}
			</button>
		</form>

		<p class="text-center text-sm text-gray-500 mt-6">
			Déjà un compte ? <a href="/login" class="text-emerald-600 font-medium hover:underline">Se connecter</a>
		</p>
	</div>
</div>
