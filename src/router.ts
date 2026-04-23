import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { RootComponent } from '@/routes/__root'
import { IndexComponent } from '@/routes/index'
import { CreateComponent } from '@/routes/create'
import { EditComponent } from '@/routes/edit'

const rootRoute = createRootRoute({
  component: RootComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexComponent,
})

const newCardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreateComponent,
})

const editCardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit/$cardId',
  component: EditComponent,
})

const routeTree = rootRoute.addChildren([indexRoute, newCardRoute, editCardRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
