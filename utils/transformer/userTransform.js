export default function transform(user) {
    return {
        id: user._id,
        avatar: user.avatar || null,
        full_name: user.full_name,
        email: user.email_address,
        groups: user.groups || [],
        roles: user.roles || "",
        verified: user.verified || false,
        user_status: user.user_status || "active",
        last_active_at: user.last_active_at || null,
        created_at: user.created_at,
        updated_at: user.updated_at || null
    }
}