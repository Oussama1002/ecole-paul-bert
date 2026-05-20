<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'permission' => \App\Http\Middleware\EnsurePermission::class,
            'block_unready_portal_roles' => \App\Http\Middleware\BlockUnreadyPortalRoles::class,
            'audit.activity' => \App\Http\Middleware\AuditApiActivity::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                $errors = $e->errors();
                $message = 'Certains champs sont invalides.';
                foreach (['email', 'username', 'password', 'role_id', 'teacher_id'] as $field) {
                    if (! empty($errors[$field][0]) && is_string($errors[$field][0])) {
                        $message = trim($errors[$field][0]);
                        break;
                    }
                }
                if ($message === 'Certains champs sont invalides.') {
                    foreach ($errors as $messages) {
                        if (is_array($messages) && isset($messages[0]) && is_string($messages[0])) {
                            $message = trim($messages[0]);
                            break;
                        }
                    }
                }
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'errors' => $errors ?: (object) [],
                ], $e->status);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ressource introuvable.',
                    'errors' => (object) [],
                ], 404);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié.',
                    'errors' => (object) [],
                ], 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Accès refusé.',
                    'errors' => (object) [],
                ], 403);
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Une erreur interne est survenue. Veuillez réessayer.',
                    'errors' => (object) [],
                ], 500);
            }
        });
    })->create();
