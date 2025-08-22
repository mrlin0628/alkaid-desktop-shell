
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/check-video" | "/api/preferences" | "/api/tools" | "/api/tools/[id]" | "/api/upload";
		RouteParams(): {
			"/api/tools/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/api": { id?: string };
			"/api/check-video": Record<string, never>;
			"/api/preferences": Record<string, never>;
			"/api/tools": { id?: string };
			"/api/tools/[id]": { id: string };
			"/api/upload": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/check-video" | "/api/check-video/" | "/api/preferences" | "/api/preferences/" | "/api/tools" | "/api/tools/" | `/api/tools/${string}` & {} | `/api/tools/${string}/` & {} | "/api/upload" | "/api/upload/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/uploads/backgrounds/background.mp4" | string & {};
	}
}