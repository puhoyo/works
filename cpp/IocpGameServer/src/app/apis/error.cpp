#include "include/error.hpp"
#include "../lib/include/user.hpp"

namespace IocpGameServer {

	void Error::handle(std::shared_ptr<User> user, std::string data) {
		puts("error");
		user->Send(kProtocol, data);
	}

} //namespace IocpGameServer