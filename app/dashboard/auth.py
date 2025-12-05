"""Simple password authentication for dashboard."""
import secrets
from typing import Optional
from fastapi import Request, Form, status
from fastapi.responses import JSONResponse, HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse


# Simple in-memory session store (for production, use Redis or database)
_active_sessions: set[str] = set()


def verify_password(password: str, correct_password: str) -> bool:
    """Verify password using constant-time comparison."""
    return secrets.compare_digest(password.encode(), correct_password.encode())


def create_session() -> str:
    """Create a new session token."""
    token = secrets.token_urlsafe(32)
    _active_sessions.add(token)
    return token


def verify_session(token: Optional[str]) -> bool:
    """Verify a session token."""
    if not token:
        return False
    return token in _active_sessions


def revoke_session(token: str):
    """Revoke a session token."""
    _active_sessions.discard(token)


def is_protected_path(path: str) -> bool:
    """Check if a path should be protected by authentication."""
    # Never protect perch API endpoints (these must be accessible for perch traces)
    if path.startswith("/api/v1/"):
        return False
    
    # Never protect login endpoint
    if path == "/login" or path.startswith("/login?"):
        return False
    
    # Never protect logout endpoint (allows clearing session)
    if path == "/logout":
        return False
    
    # Never protect health check endpoint
    if path == "/health":
        return False
    
    # Never protect static assets
    if path.startswith(("/static/", "/assets/")):
        return False
    
    # Protect dashboard routes and banking API
    if path.startswith(("/dashboard/", "/api/banking/", "/api/dashboard/")):
        return True
    
    # Protect root path (dashboard UI) - but not if it's an API or health endpoint
    if path == "/":
        return True
    
    # Protect other non-API paths (SPA routes)
    if not path.startswith("/api/") and not path.startswith("/health"):
        return True
    
    return False


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to check authentication for protected routes."""
    
    def __init__(self, app, dashboard_password: Optional[str]):
        super().__init__(app)
        self.dashboard_password = dashboard_password
    
    async def dispatch(self, request: Request, call_next):
        # If no password configured, allow all
        if not self.dashboard_password:
            return await call_next(request)
        
        # Check if path needs protection
        if is_protected_path(request.url.path):
            # Check session
            session_token = request.session.get("auth_token")
            if not verify_session(session_token):
                # For API endpoints, return 401 JSON
                if request.url.path.startswith("/api/"):
                    return JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"error": "Authentication required"}
                    )
                # For UI routes, redirect to login (but preserve the original path)
                login_url = f"/login?next={request.url.path}"
                return RedirectResponse(url=login_url, status_code=status.HTTP_302_FOUND)
        
        response = await call_next(request)
        return response


def setup_auth_routes(app, dashboard_password: Optional[str]):
    """Set up authentication routes (login/logout)."""
    
    @app.get("/login")
    async def login_page(request: Request):
        """Show login page."""
        next_url = request.query_params.get("next", "/")
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Kastrel Dashboard - Login</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .login-container {{
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    width: 100%;
                    max-width: 400px;
                }}
                h1 {{
                    margin: 0 0 1.5rem 0;
                    color: #333;
                    text-align: center;
                }}
                form {{
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }}
                input {{
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                }}
                button {{
                    padding: 0.75rem;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                    font-weight: 500;
                }}
                button:hover {{
                    background: #5568d3;
                }}
                .error {{
                    color: #dc3545;
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                    padding: 0.5rem;
                    background: #f8d7da;
                    border-radius: 4px;
                }}
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>Kastrel Dashboard</h1>
                <form method="post" action="/login">
                    <input type="hidden" name="next" value="{next_url}">
                    <input type="password" name="password" placeholder="Enter password" required autofocus>
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    @app.post("/login")
    async def login(request: Request, password: str = Form(...), next: str = Form("/")):
        """Handle login."""
        if not dashboard_password:
            return RedirectResponse(url=next, status_code=302)
        
        if verify_password(password, dashboard_password):
            # Create session
            session_token = create_session()
            request.session["auth_token"] = session_token
            return RedirectResponse(url=next, status_code=302)
        else:
            # Show error
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Kastrel Dashboard - Login</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }}
                    .login-container {{
                        background: white;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        width: 100%;
                        max-width: 400px;
                    }}
                    h1 {{
                        margin: 0 0 1.5rem 0;
                        color: #333;
                        text-align: center;
                    }}
                    form {{
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }}
                    input {{
                        padding: 0.75rem;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 1rem;
                    }}
                    button {{
                        padding: 0.75rem;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 1rem;
                        cursor: pointer;
                        font-weight: 500;
                    }}
                    button:hover {{
                        background: #5568d3;
                    }}
                    .error {{
                        color: #dc3545;
                        font-size: 0.875rem;
                        margin-top: 0.5rem;
                        padding: 0.5rem;
                        background: #f8d7da;
                        border-radius: 4px;
                    }}
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h1>Kastrel Dashboard</h1>
                    <form method="post" action="/login">
                        <input type="hidden" name="next" value="{next}">
                        <input type="password" name="password" placeholder="Enter password" required autofocus>
                        <div class="error">Invalid password. Please try again.</div>
                        <button type="submit">Login</button>
                    </form>
                </div>
            </body>
            </html>
            """
            return HTMLResponse(content=html_content, status_code=401)
    
    @app.post("/logout")
    async def logout(request: Request):
        """Handle logout."""
        session_token = request.session.get("auth_token")
        if session_token:
            revoke_session(session_token)
            request.session.clear()
        return RedirectResponse(url="/login", status_code=302)

