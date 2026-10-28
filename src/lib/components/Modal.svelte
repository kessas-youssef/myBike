<script>
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title = '',
		subtitle = '',
		size = 'md',
		children,
		footer
	} = $props();

	const sizes = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl',
		xl: 'max-w-6xl'
	};

	function close() {
		open = false;
	}

	function onKeydown(event) {
		if (event.key === 'Escape' && open) close();
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		if (open) {
			const previous = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = previous;
			};
		}
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default"
			tabindex="-1"
			aria-label="Fermer la fenêtre"
			onclick={close}
		></button>
		<div
			class="relative flex max-h-[94vh] w-full {sizes[size] || sizes.md} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
		>
			<div class="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
				<div>
					<h2 class="text-lg font-bold text-gray-900">{title}</h2>
					{#if subtitle}<p class="mt-0.5 text-sm text-gray-500">{subtitle}</p>{/if}
				</div>
				<button
					type="button"
					class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
					onclick={close}
					aria-label="Fermer"
				>
					<Icon name="x" class="h-5 w-5" />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
				{@render children()}
			</div>
			{#if footer}
				<div class="border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
