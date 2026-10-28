<script>
	let { user = null } = $props();

	let menuOpen = $state(false);

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<nav class="bg-white shadow-md fixed w-full top-0 z-50">
	<div class="max-w-7xl mx-auto px-4">
		<div class="flex justify-between h-16">
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<span class="text-2xl font-bold text-emerald-600">MyBike</span>
					<span class="text-sm text-gray-500">Djo</span>
				</a>
			</div>

			<div class="hidden md:flex items-center space-x-6">
				<a href="/" class="text-gray-700 hover:text-emerald-600 font-medium transition">Accueil</a>
				<a href="/#services" class="text-gray-700 hover:text-emerald-600 font-medium transition">Services</a>
				<a href="/#tarifs" class="text-gray-700 hover:text-emerald-600 font-medium transition">Tarifs</a>
				<a href="/reserver" class="text-gray-700 hover:text-emerald-600 font-medium transition">Réserver</a>
				{#if user}
					<a href={user.role === 'admin' ? '/admin' : '/dashboard'} class="text-gray-700 hover:text-emerald-600 font-medium transition">
						Tableau de bord
					</a>
					<span class="text-sm text-gray-500">{user.name}</span>
					<button onclick={logout} class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm font-medium">
						Déconnexion
					</button>
				{:else}
					<a href="/login" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">
						Connexion
					</a>
				{/if}
			</div>

      <button onclick={() => menuOpen = !menuOpen} class="md:hidden p-2" aria-label="Menu">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}"/>
				</svg>
			</button>
		</div>
	</div>

	{#if menuOpen}
		<div class="md:hidden bg-white border-t">
			<div class="px-4 py-3 space-y-3">
				<a href="/" class="block text-gray-700 font-medium" onclick={() => menuOpen = false}>Accueil</a>
				<a href="/#services" class="block text-gray-700 font-medium" onclick={() => menuOpen = false}>Services</a>
				<a href="/#tarifs" class="block text-gray-700 font-medium" onclick={() => menuOpen = false}>Tarifs</a>
				<a href="/reserver" class="block text-gray-700 font-medium" onclick={() => menuOpen = false}>Réserver</a>
				{#if user}
					<a href={user.role === 'admin' ? '/admin' : '/dashboard'} class="block text-gray-700 font-medium">Tableau de bord</a>
					<button onclick={logout} class="w-full bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Déconnexion</button>
				{:else}
					<a href="/login" class="block bg-emerald-600 text-white px-4 py-2 rounded-lg text-center text-sm font-medium">Connexion</a>
				{/if}
			</div>
		</div>
	{/if}
</nav>
