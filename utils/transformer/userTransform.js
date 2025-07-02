export default function transform(user) {
    return {
        id: user._id,
        avatar: user.avatar,
        full_name: user.full_name,
        email: user.email_address,
        groups: user.groups,
        roles: user.roles,
        verified: user.verified,
        created_at: user.created_at,
        updated_at: user.updated_at
    }
}