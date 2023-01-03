#include "include/set_user.hpp"
#include "../application.hpp"
#include "../lib/include/user.hpp"

namespace IocpGameServer {

	void SetUser::handle(std::shared_ptr<User> user, std::string data) {
		user->GetApp().ChatBroadcast(kProtocol, data);
	}

} //namespace IocpGameServer